# 如果在vue使用

```ts
npm install @angular/cli -D
```

```ts
yarn add typescript copyfiles -D
```

记得在`src`添加一个文件夹`app`

或者你在`angualr.json` 修改`app` 改成你对应的文件

```ts
cd ng-hello
// 打包ts
yarn build-watch2
// 打包其他文件
yarn build:p  每次修改代码的时候,记得执行这个命令进行测试
ng g ng-hello:c age1 --skip-import
```



