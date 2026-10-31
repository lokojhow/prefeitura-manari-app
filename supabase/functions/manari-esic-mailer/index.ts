import {createClient} from 'npm:@supabase/supabase-js@2.57.0';
import nodemailer from 'npm:nodemailer@10.3.1';
import {createMailerHandler} from './core.mjs';
const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createMailerHandler({
 rpc:async(name:string,params:Record<string,unknown>)=>{const {data,error}=await client.rpc(name,params);if(error)throw Error('Database operation failed');return data;},
 transportFactory:(cfg:Record<string,any>)=>nodemailer.createTransport({host:cfg.host,port:587,secure:false,requireTLS:true,pool:true,maxConnections:2,maxMessages:50,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,tls:{rejectUnauthorized:true},auth:{user:cfg.login,pass:cfg.password}})
}));
