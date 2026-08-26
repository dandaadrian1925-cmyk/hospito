export const lienInterneSur = link => {
  if (typeof link !== 'string') return '/notifications';
  if (link === '/') return link;
  if (/^\/[^/].*/.test(link)) return link;
  return '/notifications';
};
