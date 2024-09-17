import { collections } from "$lib/server/database";
import { ObjectId } from "mongodb";
import { hupi, Items } from '../hupi';

export async function POST({ request }) {

    try {
        // 解析表单数据
        const form = await request.formData();
        const form_dict = Object.fromEntries(form);

        if (hupi.check_callback(form_dict)) {
            // 业务代码
            let parts = form_dict.attach.split('>');
            const userId = new ObjectId(parts[0]);
            const name = parts[1];

            const item = Items[name];

            if (!item) {
                return Response.json({ message: "Invalid item" }, { status: 400 });
            }

            // 根据Items类型更新数据库
            let updateFields = {};
            
            // 查询用户当前的会员到期时间、Token余额和总充值金额
            const user = await collections.users.findOne({ _id: userId });

            if (name.startsWith('pro')) {
                // 处理pro会员更新
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
                    }
                };

            } else if (name.startsWith('aigt')) {
                // 处理token充值
                updateFields = {
                    $inc: {
                        tokenBalance: item.tokens,
                        totalRechargeAmount: item.price
                    }
                };
            }

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

        return Response.json({ message: "Bad request" }, { status: 400 });

    } catch (err) {
        // 错误处理
        return Response.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
