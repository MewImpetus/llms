<script lang="ts">
	// Mock data for products
	const products = [
		{
			title: "Pro 会员",
			description: "解锁Pro会员功能",
			features: [
				"无限量调用海量大模型API",
				"会员专属助手使用权限",
				"尽早体验即将推出的功能",
				"参加站长的大模型公开课权限"
			],
			price: "100 美元/30天",
			type: "订阅",
			link: "/pay/pro30"
		},
		{
			title: "Pro 年会员",
			description: "解锁年度Pro会员功能",
			features: [
				"领取大模型进阶学习资料",
				"提高API推理的性能",
				"协助用户创建实用的AI助手和Telegram Bot",
				"Telegram群管理助手使用权限"
			],
			price: "1000 美元/360天",
			type: "订阅",
			link: "/pay/pro360"
		},
		{
			title: "AI Generation Token",
			description: "用于支付需要更高算力的模型服务",
			features: [
				"可以用于支付付费模型的费用",
				"可以用于支付付费助手的费用",
				"可以用于支付订阅Telegram bot的费用",
				"未用完的部分后期可转为AIGT币提取到区块链钱包"
			],
			price: "150 美元",
			type: "获得1000万个AIGT",
			link: "/pay/aigt150"
		},
		{
			title: "定制大模型服务",
			description: "为您打造专属的AI原生应用",
			features: [
				"在几秒钟内部署专用大模型端点",
				"降低企业大模型开发成本",
				"完全托管大模型",
				"企业安全"
			],
			price: "2000 美元起",
			type: "进群联系群主",
			link: "https://t.me/+DpUFxHcNz902YTJl"
		}
	];
</script>




<div class="scrollbar-custom mr-1 h-full overflow-y-auto py-12 max-sm:pt-8 md:py-24">
	<div class="pt-42 mx-auto flex flex-col px-5 xl:w-[60rem] 2xl:w-[64rem]">
		<div class="flex items-center">
			<h1 class="text-2xl font-bold">Pricing</h1>
		</div>
		<h3 class="text-gray-500">无需GPU快速开启大模型应用。</h3>
		<dl class="mt-8 grid grid-cols-1 gap-3 sm:gap-5 xl:grid-cols-2">
			{#each products as product}
				<a
					href="{product.link}"
					class="relative flex flex-col gap-2 overflow-hidden rounded-xl border bg-gray-50/50 px-6 py-5 shadow hover:bg-gray-50 hover:shadow-inner dark:border-gray-800/70 dark:bg-gray-950/20 dark:hover:bg-gray-950/40"
				>
					<div class="flex items-center justify-between gap-1">
						<div class="font-semibold text-lg">
							{product.title}
						</div>
					</div>
					<dt class="text-gray-500 dark:text-gray-400">{product.description}</dt>
					<ul class="text-sm text-gray-500 dark:text-gray-400 list-disc pl-5">
						{#each product.features as feature}
							<li>{feature}</li>
						{/each}
					</ul>
					<dd class="text-sm text-gray-700 dark:text-gray-300 mt-2">
						<span class="font-semibold">{product.price}</span> <span>({product.type})</span>
					</dd>
				</a>
			{/each}
		</dl>
	</div>
</div>
