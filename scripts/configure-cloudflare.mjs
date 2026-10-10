import fs from 'node:fs';
import path from 'node:path';
const database=process.env.CF_DATABASE_ID,bucket=process.env.CF_BUCKET_NAME,origin=process.env.APP_ORIGIN;
if(!database||database==='00000000-0000-4000-8000-000000000000'||!bucket||!origin?.startsWith('https://'))throw new Error('Set CF_DATABASE_ID, CF_BUCKET_NAME and an HTTPS APP_ORIGIN.');
const built=JSON.parse(fs.readFileSync('dist/server/wrangler.json','utf8'));
const config={...built,name:process.env.CF_WORKER_NAME||'campus-bookstore',main:path.resolve('dist/server/index.js'),assets:{directory:path.resolve('dist/client')},vars:{APP_ORIGIN:origin},d1_databases:[{binding:'DB',database_name:'campus-bookstore',database_id:database}],r2_buckets:[{binding:'BUCKET',bucket_name:bucket}],observability:{enabled:true}};
fs.mkdirSync('.deployment',{recursive:true});fs.writeFileSync('.deployment/wrangler.json',JSON.stringify(config,null,2));console.log('Generated .deployment/wrangler.json. Review resource bindings before deployment.');
