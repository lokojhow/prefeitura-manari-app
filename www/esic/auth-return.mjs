export const RECOVERY_STORAGE='manari-esic-recovery-v1';

export function authReturnState(href) {
 const url=new URL(href),fragment=new URLSearchParams(url.hash.slice(1));
 return {recovery:fragment.get('type')==='recovery',error:fragment.has('error')||fragment.has('error_code')};
}

export function recoveryDestination(href) {
 const state=authReturnState(href);
 if(!state.recovery&&!state.error)return null;
 const current=new URL(href),target=new URL('./redefinir-senha/',current);
 target.hash=current.hash;
 return target.href;
}

// This marker only restores the recovery screen after a reload. Supabase still
// verifies the signed-in user before any password update is allowed.
export function rememberRecovery(storage,session) {
 if(!session?.user?.id)return;
 try {storage.setItem(RECOVERY_STORAGE,JSON.stringify({userId:session.user.id,expiresAt:Math.min(session.expires_at*1000||Infinity,Date.now()+3600000)}));}catch{}
}
export function recoveryUser(storage) {
 try {const saved=JSON.parse(storage.getItem(RECOVERY_STORAGE));return saved?.expiresAt>Date.now()?saved.userId:null;}catch{return null;}
}
export function clearRecovery(storage) {try {storage.removeItem(RECOVERY_STORAGE);}catch{}}

export function validateNewPassword(password,confirmation) {
 if(password.length<8||password.length>128)throw Error('Use uma senha de 8 a 128 caracteres.');
 if(password!==confirmation)throw Error('As senhas não são iguais. Digite a mesma senha nos dois campos.');
}
