const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('www/portal-auth.js','utf8');
const helper=source.slice(source.indexOf(' function getEmailRedirectUrl(){'),source.indexOf(' async function getClient(){'));
const canonical='https://lokojhow.github.io/prefeitura-manari-app/www/index.html';
const invitation='12345678-1234-1234-1234-123456789012';
for(const page of ['https://localhost/','http://localhost:3000/','capacitor://localhost/','https://example.test/index.html']){
 const context={URL,CFG:{authRedirectUrl:canonical},location:{href:page+'?portal_invite='+invitation+'&redirect_to=https://evil.test&access_token=secret#access_token=secret'}};
 vm.createContext(context);vm.runInContext(helper+';result=getEmailRedirectUrl()',context);
 assert.equal(context.result,canonical+'?portal_invite='+invitation);
}
const context={URL,CFG:{},location:{href:'https://localhost/?portal_invite=invalid'}};
vm.createContext(context);vm.runInContext(helper+';result=getEmailRedirectUrl()',context);assert.equal(context.result,canonical);
assert(!source.includes("emailRedirectTo:location.href"));
console.log('PASS: retorno HTTPS público no APK e web; convite preservado; tokens de sessão e destinos externos descartados');
