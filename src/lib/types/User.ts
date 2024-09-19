import type { ObjectId } from "mongodb";
import type { Timestamps } from "./Timestamps";

export interface User extends Timestamps {
	_id: ObjectId;

	username?: string;
	name: string;
	email?: string;
	avatarUrl: string | undefined;
	hfUserId: string;
	isAdmin?: boolean;
	isEarlyAccess?: boolean;

	// 新增字段
	proExpiration?: Date; // 会员到期时间
	tokenBalance?: number; // Token 余额
	totalRechargeAmount?: number; // 总充值金额
	apiKey?: string; // API Key
	// 存入订单号
	trade_order_ids: [String]
}
