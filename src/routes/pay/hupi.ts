import { env } from "$env/dynamic/private";
import crypto from 'crypto';
import qs from 'querystring';

// Define the rate for the items
const rate = 7.3

// Define the items with proper typing
interface Item {
    name: string;
    price: number;
    tokens: number;
}

const Items: Record<string, Item> = {
    "pro30": { "name": "LLMsChat 30天PRO会员", "price": 100 * rate, "tokens": 0 },
    "pro360": { "name": "LLMsChat 360天PRO会员", "price": 1000 * rate, "tokens": 0 },
    "aigt150": { "name": "LLMsChat 充值1000万AIGT", "price": 150 * rate, "tokens": 10000000 },
    "justfortest": { "name": "LLMsChat 充值1000万AIGT", "price": 0.01, "tokens": 10000000 }
}

interface AttributeMap {
    [key: string]: string | number;
}

interface FormDict {
    status: string;
    hash: string;
    [key: string]: string | number;
}

class Hupi {
    private domain: string;
    private appid: string;
    private appSecret: string;
    private notifyUrl: string;
    private returnUrl: string;
    private callbackUrl: string;

    constructor(domain: string) {
        this.domain = domain;
        // Handle possible null or undefined values explicitly
        this.appid = env.HUPI_APP_ID || (() => { throw new Error('HUPI_APP_ID is not set'); })();
        this.appSecret = env.HUPI_APP_SECRET || (() => { throw new Error('HUPI_APP_SECRET is not set'); })();
        this.notifyUrl = `https://${this.domain}/pay/callback`;
        this.returnUrl = `https://${this.domain}`;
        this.callbackUrl = `https://${this.domain}`;
    }

    sign(attributes: AttributeMap): string {
        const sortedAttributes = Object.keys(attributes)
            .sort()
            .map(key => `${key}=${attributes[key]}`)
            .join('&');
        const stringifiedAttributes = sortedAttributes + this.appSecret;
        return crypto.createHash('md5').update(stringifiedAttributes).digest('hex');
    }

    check_callback(form_dict: FormDict): boolean {
        if (form_dict.status !== "OD") {
            return false;
        }
        const _hash = form_dict.hash;
        delete form_dict.hash;
        return this.sign(form_dict) === _hash;
    }

    async curl(data: AttributeMap, url: string): Promise<any> {  // You can further type this response if you know the structure
        data.hash = this.sign(data);
        const headers = { "Referer": this.returnUrl, "Content-Type": "application/x-www-form-urlencoded" };
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: qs.stringify(data),
            });
            return await response.json();
        } catch (error) {
            console.error(error);
        }
    }

    async pay(tradeOrderId: string, totalFee: number, attach: string, title: string = "LLMsChat", payment: string = "wechat"): Promise<any> {
        const url = env.HUPI_URL || (() => { throw new Error('HUPI_URL is not set'); })();
        const data: AttributeMap = {
            version: "1.1",
            lang: "zh-cn",
            plugins: "svelte-kit",
            attach: attach,
            appid: this.appid,
            trade_order_id: tradeOrderId,
            payment: payment,
            is_app: "Y",
            total_fee: totalFee,
            title: title,
            description: "",
            time: Math.floor(Date.now() / 1000).toString(),
            notify_url: this.notifyUrl,
            return_url: this.returnUrl,
            callback_url: this.callbackUrl,
            nonce_str: Math.floor(Date.now() / 1000).toString()
        };

        return await this.curl(data, url);
    }
}

// Set domain from the environment variable
const DOMAIN = env.HUPI_CALLBACK_DOMAIN || (() => { throw new Error('HUPI_CALLBACK_DOMAIN is not set'); })();

// Initialize the Hupi instance
const hupi = new Hupi(DOMAIN);

// Export the hupi instance, DOMAIN, and Items
export { hupi, DOMAIN, Items };
