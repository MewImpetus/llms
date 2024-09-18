<script lang="ts">
	import Modal from "$lib/components/Modal.svelte";
	import CarbonClose from "~icons/carbon/close";
	import CarbonTrashCan from "~icons/carbon/trash-can";
	import CarbonArrowUpRight from "~icons/carbon/arrow-up-right";
	import CarbonCopy from "~icons/carbon/copy";
	import { enhance } from "$app/forms";
	import { base } from "$app/paths";

	import { useSettingsStore } from "$lib/stores/settings";
	import Switch from "$lib/components/Switch.svelte";
	import { env as envPublic } from "$env/dynamic/public";

	import type { PageData } from './$types';
  	
	export let data: PageData;

	let isConfirmingDeletion = false;
	let showApiKey = false;  // 控制API Key显示状态
	let showCopiedMessage = false; // 控制显示“已复制”提示
	let settings = useSettingsStore();

	// 将API key掩码处理
	const maskedApiKey = `${data.user.apiKey.slice(0, 4)}****${data.user.apiKey.slice(-4)}`;

	// 计算剩余的 Pro 会员天数或小时
	const calculateProRemaining = () => {
		const expirationDate = new Date(data.user.proExpiration);
		const now = new Date();
		const diffMs = expirationDate.getTime() - now.getTime(); // 剩余时间的毫秒数

		if (diffMs <= 0) {
			return { status: "expired", value: "已过期" };
		}

		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		if (diffDays > 0) {
			return { status: "days", value: `${diffDays} 天` };
		}

		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		return { status: "hours", value: `${diffHours} 小时` };
	};

	// 获取 Pro 会员状态
	let proStatus = calculateProRemaining();

	// 复制API Key到剪切板
	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(data.user.apiKey);
			showCopiedMessage = true;

			// 在几秒钟后隐藏“已复制”提示
			setTimeout(() => {
				showCopiedMessage = false;
			}, 2000);  // 显示2秒
		} catch (err) {
			console.error("复制失败", err);
		}
	};
</script>

<style>
	.pro-status {
		font-weight: bold;
		font-size: 1.2rem;
		color: #3490dc;
	}
	.expired-status {
		font-weight: bold;
		font-size: 1.2rem;
		color: #e3342f;
	}
	.balance-amount {
		font-size: 1.4rem;
		font-weight: bold;
		color: #2d3748;
	}
	
	/* 图标按钮的样式 */
	.icon-link {
		display: inline-flex;
		align-items: center;
		color: #3490dc;
		cursor: pointer;
		text-decoration: none;
		font-size: 0.9rem;
		transition: color 0.3s ease;
	}

	.icon-link:hover {
		color: #2779bd;
	}

	

	.link-text {
		font-size: 0.9rem;
	}

	/* 调整链接与前面内容的间距 */
	.ml-2 {
		margin-left: 0.5rem;
	}
</style>


<div class="flex w-full flex-col gap-5">
	<div class="flex items-start justify-between text-xl font-semibold text-gray-800">
		<h2>Application Settings</h2>
	</div>

	<div class="flex h-full flex-col gap-4 pt-4 max-sm:pt-0">
		{#if envPublic.PUBLIC_APP_DATA_SHARING === "1"}
			<!-- svelte-ignore a11y-label-has-associated-control -->
			<label class="flex items-center">
				<Switch
					name="shareConversationsWithModelAuthors"
					bind:checked={$settings.shareConversationsWithModelAuthors}
				/>
				<div class="inline cursor-pointer select-none items-center gap-2 pl-2">
					Share conversations with model authors
				</div>
			</label>

			<p class="text-sm text-gray-500">
				Sharing your data will help improve the training data and make open models better over time.
			</p>
		{/if}
		<!-- svelte-ignore a11y-label-has-associated-control -->
		<label class="mt-2 flex items-center">
			<Switch name="hideEmojiOnSidebar" bind:checked={$settings.hideEmojiOnSidebar} />
			<div class="inline cursor-pointer select-none items-center gap-2 pl-2">
				Hide emoticons in conversation topics
			</div>
		</label>

		<!-- svelte-ignore a11y-label-has-associated-control -->
		<label class="mt-1 flex items-center">
			<Switch name="disableStream" bind:checked={$settings.disableStream} />
			<div class="inline cursor-pointer select-none items-center gap-2 pl-2">
				Disable streaming tokens
			</div>
		</label>

		<div class="mt-1 flex flex-col gap-3">
			<a
				href="https://t.me/+DpUFxHcNz902YTJl"
				target="_blank"
				rel="noreferrer"
				class="flex items-center underline decoration-gray-300 underline-offset-2 hover:decoration-gray-700"
				><CarbonArrowUpRight class="mr-1.5 shrink-0 text-sm " /> Share your feedback on Telegram group</a
			>
			<button
				on:click|preventDefault={() => (isConfirmingDeletion = true)}
				type="submit"
				class="flex items-center underline decoration-gray-300 underline-offset-2 hover:decoration-gray-700"
				><CarbonTrashCan class="mr-2 inline text-sm text-red-500" />Delete all conversations</button
			>
		</div>
	</div>

	<div class="mt-12 flex items-start justify-between text-xl font-semibold text-gray-800">
		<h2>Account Info</h2>
	</div>

	<div class="mt-3 flex flex-col gap-3">
		<!-- Pro会员剩余天数/小时 -->
		<span class="flex items-center">
			💎 &nbsp;<strong>Pro会员剩余:</strong>
			<span class={proStatus.status === "expired" ? "expired-status ml-2" : "pro-status ml-2"}>
				{proStatus.value}
			</span>
			<!-- 续费会员小图标按钮 -->
			<a href="/pay/pro30" class="icon-link ml-2">
				<CarbonArrowUpRight class="icon" />
				<span class="link-text">立即续费30天</span>
			</a>
		</span>

		<!-- AIGT 余额展示 -->
		<span class="flex items-center">
			💰 &nbsp;<strong>AIGT余额:</strong>
			<span class="balance-amount ml-2">{data.user.tokenBalance}</span>
			<!-- 充值小图标按钮 -->
			<a href="/pay/aigt150" class="icon-link ml-2">
				<CarbonArrowUpRight class="icon" />
				<span class="link-text">立即充值150USD</span>
			</a>
		</span>

		<!-- API Key展示 -->
		<span class="flex items-center">
			🔑 &nbsp;<strong>API Key:</strong>
			<!-- 点击API Key本身来切换显示/隐藏 -->
			<span on:click={() => showApiKey = !showApiKey} class="ml-2 cursor-pointer">
				{showApiKey ? data.user.apiKey : maskedApiKey}
			</span>

			<!-- 复制API Key到剪贴板 -->
			<button on:click={copyToClipboard} class="ml-2">
				<CarbonCopy class="text-gray-500 cursor-pointer" />
			</button>

			<!-- 显示“已复制”提示 -->
			{#if showCopiedMessage}
				<span class="ml-2 text-sm text-green-500">已复制</span>
			{/if}
		</span>
	</div>

	{#if isConfirmingDeletion}
		<Modal on:close={() => (isConfirmingDeletion = false)}>
			<form
				use:enhance={() => {
					isConfirmingDeletion = false;
				}}
				method="post"
				action="{base}/conversations?/delete"
				class="flex w-full flex-col gap-5 p-6"
			>
				<div class="flex items-start justify-between text-xl font-semibold text-gray-800">
					<h2>Are you sure?</h2>
					<button
						type="button"
						class="group"
						on:click|stopPropagation={() => (isConfirmingDeletion = false)}
					>
						<CarbonClose class="text-gray-900 group-hover:text-gray-500" />
					</button>
				</div>
				<p class="text-gray-800">
					This action will delete all your conversations. This cannot be undone.
				</p>
				<button
					type="submit"
					class="mt-2 rounded-full bg-red-700 px-5 py-2 text-lg font-semibold text-gray-100 ring-gray-400 ring-offset-1 transition-all hover:ring focus-visible:outline-none focus-visible:ring"
				>
					Confirm deletion
				</button>
			</form>
		</Modal>
	{/if}
</div>

