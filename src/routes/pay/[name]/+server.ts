import { v4 as uuidv4 } from 'uuid'
import { hupi, Items } from '../hupi'


export async function GET({ locals, params }) {

    const { name } = params;
	if (locals.user) {
		const userId = locals.user._id;
        const tradeOrderId = uuidv4()
        const price = Items[name].price
        const attach = `${userId}>${name}`
        try {
            const response = await hupi.pay(tradeOrderId, price, attach, Items[name].name);
            // 使用303状态码进行重定向
            return new Response(null, {
                status: 303,
                headers: {
                    Location: response.url
                }
            });
        } catch (error) {
            console.error(error);
            // 处理错误情况，例如返回错误消息
            return Response.json({ message: "Payment failed" }, {status: 500})
        }
	}
	return Response.json({ message: "Must be signed in" }, { status: 401 });
}