/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Strip active content from uploaded SVG emotes. */
export function sanitizeSvgBuffer(buffer) {
  let text = buffer.toString('utf8');
  if (!/<svg[\s>]/i.test(text)) throw new Error('Invalid SVG');

  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '');
  text = text.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  text = text.replace(/<embed[\s\S]*?\/?>/gi, '');
  text = text.replace(/<object[\s\S]*?<\/object>/gi, '');
  text = text.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  text = text.replace(/\s(?:xlink:)?href\s*=\s*("|')\s*javascript:[^"']*\1/gi, '');
  text = text.replace(/javascript:/gi, '');
  text = text.replace(/vbscript:/gi, '');
  text = text.replace(/data:\s*text\/html/gi, 'data:blocked');

  if (/<script|foreignObject|javascript:|vbscript:|<iframe|<embed|<object/i.test(text)) {
    throw new Error('SVG contains disallowed content');
  }
  return Buffer.from(text, 'utf8');
}