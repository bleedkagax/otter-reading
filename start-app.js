// 检查环境变量
console.log('正在检查环境变量...');
console.log('GEMINI_API_KEY 是否存在:', process.env.GEMINI_API_KEY ? '是' : '否');

// 启动应用程序
const { spawn } = require('child_process');
console.log('正在启动应用程序...');

// 使用 npm start 启动应用程序
const app = spawn('npm', ['start'], {
  stdio: 'inherit', // 将子进程的标准输入/输出/错误流传递给父进程
  env: process.env // 传递所有环境变量
});

app.on('close', (code) => {
  console.log(`应用程序已退出，退出码: ${code}`);
});
