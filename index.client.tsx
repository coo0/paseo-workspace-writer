// 本插件不需要任何客户端 UI。
// 这个文件必须存在（Paseo 要求插件两端都有入口），
// 但不做任何事，也不 import 任何 server 相关的东西。
export default function contribute() {
  return () => {};
}
