import {
	Issuer,
	type BaseClient,
	type UserinfoResponse,
	type TokenSet,
	custom,
} from "openid-client";
import { addHours, addWeeks } from "date-fns";
import { env } from "$env/dynamic/private";
import { sha256 } from "$lib/utils/sha256";
import { z } from "zod";
import { dev } from "$app/environment";
import type { Cookies } from "@sveltejs/kit";
import { collections } from "$lib/server/database";
import JSON5 from "json5";
import { logger } from "$lib/server/logger";

export interface OIDCSettings {
	redirectURI: string;
}

export interface OIDCUserInfo {
	token: TokenSet;
	userData: UserinfoResponse;
}

const stringWithDefault = (value: string) =>
	z
		.string()
		.default(value)
		.transform((el) => (el ? el : value));

export const OIDConfig = z
	.object({
		CLIENT_ID: stringWithDefault(env.OPENID_CLIENT_ID),
		CLIENT_SECRET: stringWithDefault(env.OPENID_CLIENT_SECRET),
		PROVIDER_URL: stringWithDefault(env.OPENID_PROVIDER_URL),
		SCOPES: stringWithDefault(env.OPENID_SCOPES),
		NAME_CLAIM: stringWithDefault(env.OPENID_NAME_CLAIM).refine(
			(el) => !["preferred_username", "email", "picture", "sub"].includes(el),
			{ message: "nameClaim cannot be one of the restricted keys." }
		),
		TOLERANCE: stringWithDefault(env.OPENID_TOLERANCE),
		RESOURCE: stringWithDefault(env.OPENID_RESOURCE),
		ID_TOKEN_SIGNED_RESPONSE_ALG: z.string().optional(),
	})
	.parse(JSON5.parse(env.OPENID_CONFIG || "{}"));

export const requiresUser = !!OIDConfig.CLIENT_ID && !!OIDConfig.CLIENT_SECRET;

const sameSite = z
	.enum(["lax", "none", "strict"])
	.default(dev || env.ALLOW_INSECURE_COOKIES === "true" ? "lax" : "none")
	.parse(env.COOKIE_SAMESITE === "" ? undefined : env.COOKIE_SAMESITE);

const secure = z
	.boolean()
	.default(!(dev || env.ALLOW_INSECURE_COOKIES === "true"))
	.parse(env.COOKIE_SECURE === "" ? undefined : env.COOKIE_SECURE === "true");

export function refreshSessionCookie(cookies: Cookies, sessionId: string) {
	cookies.set(env.COOKIE_NAME, sessionId, {
		path: "/",
		// So that it works inside the space's iframe
		sameSite,
		secure,
		httpOnly: true,
		expires: addWeeks(new Date(), 2),
	});
}

export async function findUser(sessionId: string) {
	const session = await collections.sessions.findOne({ sessionId });

	if (!session) {
		return null;
	}

	return await collections.users.findOne({ _id: session.userId });
}
export const authCondition = (locals: App.Locals) => {
	return locals.user
		? { userId: locals.user._id }
		: { sessionId: locals.sessionId, userId: { $exists: false } };
};

/**
 * Generates a CSRF token using the user sessionId. Note that we don't need a secret because sessionId is enough.
 */
export async function generateCsrfToken(sessionId: string, redirectUrl: string): Promise<string> {
	const data = {
		expiration: addHours(new Date(), 1).getTime(),
		redirectUrl,
	};

	return Buffer.from(
		JSON.stringify({
			data,
			signature: await sha256(JSON.stringify(data) + "##" + sessionId),
		})
	).toString("base64");
}

async function getOIDCClient(settings: OIDCSettings): Promise<BaseClient> {
	let issuer: Issuer;

	if (OIDConfig.PROVIDER_URL.includes("authing.cn")) {
		// 如果 PROVIDER_URL 包含 authing.cn，则手动创建 OIDC 客户端
		issuer = new Issuer({
			issuer: `${OIDConfig.PROVIDER_URL}/oidc`,
			authorization_endpoint: `${OIDConfig.PROVIDER_URL}/oidc/auth`,
			token_endpoint: `${OIDConfig.PROVIDER_URL}/oidc/token`,
			userinfo_endpoint: `${OIDConfig.PROVIDER_URL}/oidc/me`,
			jwks_uri: `${OIDConfig.PROVIDER_URL}/oidc/.well-known/jwks.json`,
		});
		return issuer
	} else {
		issuer = await Issuer.discover(OIDConfig.PROVIDER_URL);
	}

	const client_config: ConstructorParameters<typeof issuer.Client>[0] = {
		client_id: OIDConfig.CLIENT_ID,
		client_secret: OIDConfig.CLIENT_SECRET,
		redirect_uris: [settings.redirectURI],
		response_types: ["code"],
		[custom.clock_tolerance]: OIDConfig.TOLERANCE || undefined,
		id_token_signed_response_alg: OIDConfig.ID_TOKEN_SIGNED_RESPONSE_ALG || undefined,
	};

	const alg_supported = issuer.metadata["id_token_signing_alg_values_supported"];

	if (Array.isArray(alg_supported)) {
		client_config.id_token_signed_response_alg ??= alg_supported[0];
	}

	return new issuer.Client(client_config);
}

export async function getOIDCAuthorizationUrl(
	settings: OIDCSettings,
	params: { sessionId: string }
): Promise<string> {
	const client = await getOIDCClient(settings);
	const csrfToken = await generateCsrfToken(params.sessionId, settings.redirectURI);

	return client.authorizationUrl({
		scope: OIDConfig.SCOPES,
		state: csrfToken,
		resource: OIDConfig.RESOURCE || undefined,
	});
}

// 对电话号码进行脱敏
function maskPhone(phone) {
	if (phone && phone.length > 7) {
		// 仅保留前3位和后4位，中间用 '*' 代替
		return phone.substring(0, 3) + "****" + phone.substring(phone.length - 4);
	}
	return phone;
}

// 对邮箱进行脱敏
function maskEmail(email) {
	if (email) {
		const emailParts = email.split("@");
		if (emailParts[0].length > 2) {
			// 仅保留邮箱名的前两位和 '@' 后的域名部分
			return emailParts[0].substring(0, 2) + "****" + "@" + emailParts[1];
		}
		return email; // 如果邮箱名太短，不做脱敏处理
	}
	return email;
}

export async function getOIDCUserData(
	settings: OIDCSettings,
	code: string,
	iss?: string
): Promise<OIDCUserInfo> {
	const client = await getOIDCClient(settings);
	const token = await client.callback(settings.redirectURI, { code, iss });
	let userData = await client.userinfo(token);
	userData = {
		sub: userData.sub,
		name: userData.phone_number || userData.email,
		preferred_username: maskPhone(userData.phone_number) || maskEmail(userData.email),
		profile: "",
		picture: userData.picture,
		isPro: userData.isPro || "",
		orgs: [],
	};
	return { token, userData };
}

export async function validateAndParseCsrfToken(
	token: string,
	sessionId: string
): Promise<{
	/** This is the redirect url that was passed to the OIDC provider */
	redirectUrl: string;
} | null> {
	try {
		const { data, signature } = z
			.object({
				data: z.object({
					expiration: z.number().int(),
					redirectUrl: z.string().url(),
				}),
				signature: z.string().length(64),
			})
			.parse(JSON.parse(token));
		const reconstructSign = await sha256(JSON.stringify(data) + "##" + sessionId);

		if (data.expiration > Date.now() && signature === reconstructSign) {
			return { redirectUrl: data.redirectUrl };
		}
	} catch (e) {
		logger.error(e);
	}
	return null;
}
