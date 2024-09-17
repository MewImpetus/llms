import type { PageServerLoad } from './$types';

export const load = (async ({ locals, parent }) => {
  // 获取父布局的数据
  const parentData = await parent();

  // 从 locals 获取用户信息
  const user = locals.user;

  if (user && user._id) {
    delete user._id;
  }  

  return {
    user,          // 将用户信息传递给页面
  };
}) satisfies PageServerLoad;
