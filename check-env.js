// 检查环境变量
console.log('正在检查环境变量...');
console.log('GEMINI_API_KEY 是否存在:', process.env.GEMINI_API_KEY ? '是' : '否');

// 如果环境变量不存在，尝试从 .env 文件加载
if (!process.env.GEMINI_API_KEY) {
  console.log('尝试从 .env 文件加载环境变量...');
  require('dotenv').config();
  console.log('加载后 GEMINI_API_KEY 是否存在:', process.env.GEMINI_API_KEY ? '是' : '否');
}

// 打印 GEMINI_API_KEY 的前几个字符（如果存在）
if (process.env.GEMINI_API_KEY) {
  const key = process.env.GEMINI_API_KEY;
  console.log('GEMINI_API_KEY 前缀:', key.substring(0, 5) + '...');
  console.log('GEMINI_API_KEY 长度:', key.length);
  console.log('GEMINI_API_KEY 是否为默认值:', key === 'your-gemini-api-key-here' ? '是' : '否');
}

// 打印所有环境变量的键（不显示值以保护敏感信息）
console.log('所有环境变量键:');
console.log(Object.keys(process.env));
