import { collections } from "$lib/server/database";
import { ObjectId } from "mongodb";
import { hupi, Items } from '../hupi';

export async function POST({ request }) {
    try {
        // 解析表单数据
        const form = await request.formData();
        const form_dict = Object.fromEntries(form);
        
        // 验证回调请求是否合法
        if (hupi.check_callback(form_dict)) {
            // 从 attach 中解析 userId 和商品名称
            let parts = form_dict.attach.split('>');
            const userId = new ObjectId(parts[0]);
            const name = parts[1];

            const item = Items[name];

            if (!item) {
                return new Response(JSON.stringify({ message: "Invalid item" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }

            // 查询用户信息
            const user = await collections.users.findOne({ _id: userId });
            
            // 检查是否重复订单
            if (user?.trade_order_ids.includes(form_dict.trade_order_id)) {
                return new Response(JSON.stringify({ message: "Duplicate request" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }

            // 根据 Items 类型更新数据库
            let updateFields = {};

            if (name.startsWith('pro')) {
                // 处理 pro 会员更新
                const membershipDays = name === 'pro30' ? 30 : 360;
                let newExpirationDate = new Date(Date.now() + membershipDays * 24 * 60 * 60 * 1000);

                // 如果当前会员还没到期，会员截止时间从到期日往上加
                if (user.proExpiration && new Date(user.proExpiration) > new Date()) {
                    newExpirationDate = new Date(user.proExpiration.getTime() + membershipDays * 24 * 60 * 60 * 1000);
                }

                updateFields = {
                    $set: {
                        proExpiration: newExpirationDate
                    },
                    $inc: {
                        tokenBalance: item.tokens,
                        totalRechargeAmount: item.price
                    },
                    $addToSet: { trade_order_ids: form_dict.trade_order_id } // 确保 trade_order_id 在所有订单类型中都添加
                };

            } else if (name.startsWith('aigt')) {
                // 处理 token 充值
                updateFields = {
                    $inc: {
                        tokenBalance: item.tokens,
                        totalRechargeAmount: item.price
                    },
                    $addToSet: { trade_order_ids: form_dict.trade_order_id }
                };
            }

            // 更新用户信息
            await collections.users.updateOne(
                { _id: userId },
                updateFields
            );

            // 返回成功响应
            return new Response('success', {
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
            });
        }

        return new Response(JSON.stringify({ message: "Bad request" }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    } catch (err) {
        // 错误处理
        return new Response(JSON.stringify({ message: "Internal Server Error for the request"}), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
