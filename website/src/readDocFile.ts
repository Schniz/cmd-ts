import removeMd from 'remove-markdown';

export async function readDocFile(
  file: string,
  options?: { strip: boolean }
): Promise<{ body: string; title: string; subtitles: string[] }> {
  const { default: markdown } = await import(`!raw-loader!~/docs/${file}`);
  const body: string = markdown;
  const lines = body.split('\n');
  const titleIndex = lines.findIndex(x => x.startsWith('# '));
  const titleLine = titleIndex > -1 ? lines[titleIndex] : undefined;
  const title = titleLine?.replace(/^# /, '') ?? 'Untitled';
  lines.splice(titleIndex, 1);

  const subtitles = lines.filter(x => x.match(/^#+ \w/));

  const treatMd = options?.strip ? removeMd : <T>(x: T): T => x;
  return {
    body: treatMd(lines.join('\n')),
    title: treatMd(title),
    subtitles: subtitles.map(v => treatMd(v)),
  };
}
