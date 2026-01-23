import { nanoid, customAlphabet } from 'nanoid';

export const shortid = (
  prefix = '',
  options?: {
    alphabet?: string;
    length?: number;
  },
) => {
  const {
    alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    length = 10,
  } = options || {};
  const genId = customAlphabet(alphabet, length);
  return `${prefix}${genId()}`;
};

// 生成UUID，将中划线替换为下划线
export const uuid = () => nanoid().replace(/-/g, '_');

export const id = shortid;

export const generate = shortid;
