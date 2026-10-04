// Telegram file helper for grammY
export async function getFileLink(ctx, file_id) {
  const file = await ctx.api.getFile(file_id);
  const token = ctx.api.token;
  return `https://api.telegram.org/file/bot${token}/${file.file_path}`;
}
