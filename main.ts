// Tiny stack VM for make.fun ISA v1: 37 opcodes, 32-bit wrapping values,
// a 256-value data stack, a 64-deep call stack, 256 words of memory.
// Traps 2-11 end the program at once; the trap code is the exit code and
// the output written before the trap is kept. Step limit 1,000,000,
// output limit 65,536 bytes. Driver: reads /input/<id>/program.bin and
// /input/<id>/input.bin, writes /output/<id>/stdout.bin + exit.txt.
import {mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const IND=process.env.MAKEFUN_INPUT_DIR??'/input';
const OUTD=process.env.MAKEFUN_OUTPUT_DIR??'/output';
function run(p,g){
 const S=new Int32Array(256);let sp=0;
 const C=new Int32Array(64);let cp=0;
 const M=new Int32Array(256);
 const o=[];let pc=0,st=0,ip=0;
 const done=e=>({exit:e,stdout:Buffer.from(o)});
 for(;;){
  if(st===1000000)return done(10);
  if(pc<0||pc>=p.length)return done(9);
  const op=p[pc];
  let im=0;
  if(op===1)im=1;else if(op===2)im=4;else if(op>=48&&op<=51)im=2;
  if(pc+im>=p.length)return done(9);
  st++;
  const nx=pc+1+im;pc=nx;
  switch(op){
   case 0:return done(0);
   case 1:if(sp>=256)return done(3);S[sp++]=(p[nx-1]<<24)>>24;break;
   case 2:if(sp>=256)return done(3);S[sp++]=p[nx-4]|(p[nx-3]<<8)|(p[nx-2]<<16)|(p[nx-1]<<24);break;
   case 3:if(sp<1)return done(2);sp--;break;
   case 4:if(sp<1)return done(2);if(sp>=256)return done(3);S[sp]=S[sp-1];sp++;break;
   case 5:if(sp<2)return done(2);{const t=S[sp-1];S[sp-1]=S[sp-2];S[sp-2]=t;}break;
   case 6:if(sp<2)return done(2);if(sp>=256)return done(3);S[sp]=S[sp-2];sp++;break;
   case 7:if(sp<3)return done(2);{const a=S[sp-3];S[sp-3]=S[sp-2];S[sp-2]=S[sp-1];S[sp-1]=a;}break;
   case 16:case 17:case 18:case 19:case 20:case 21:case 22:case 24:case 25:case 26:case 28:case 29:case 30:case 32:case 33:case 34:{
    if(sp<2)return done(2);
    const b=S[sp-1],a=S[sp-2];let r=0;
    if(op===16)r=(a+b)|0;
    else if(op===17)r=(a-b)|0;
    else if(op===18)r=Math.imul(a,b);
    else if(op===19){if(b===0)return done(4);r=a===-2147483648&&b===-1?a:(a/b)|0;}
    else if(op===20){if(b===0)return done(4);r=b===-1?0:(a%b)|0;}
    else if(op===21){if(b===0)return done(4);r=Math.floor((a>>>0)/(b>>>0))|0;}
    else if(op===22){if(b===0)return done(4);r=((a>>>0)%(b>>>0))|0;}
    else if(op===24)r=a&b;
    else if(op===25)r=a|b;
    else if(op===26)r=a^b;
    else if(op===28)r=a<<(b&31);
    else if(op===29)r=a>>(b&31);
    else if(op===30)r=(a>>>(b&31))|0;
    else if(op===32)r=a===b?1:0;
    else if(op===33)r=a<b?1:0;
    else r=(a>>>0)<(b>>>0)?1:0;
    S[sp-2]=r;sp--;break;}
   case 23:if(sp<1)return done(2);S[sp-1]=(-S[sp-1])|0;break;
   case 27:if(sp<1)return done(2);S[sp-1]=~S[sp-1];break;
   case 48:{const rel=((p[nx-2]|(p[nx-1]<<8))<<16)>>16;pc=nx+rel;break;}
   case 49:case 50:{
    if(sp<1)return done(2);
    const v=S[--sp],rel=((p[nx-2]|(p[nx-1]<<8))<<16)>>16;
    if((op===49&&v===0)||(op===50&&v!==0))pc=nx+rel;break;}
   case 51:if(cp>=64)return done(7);C[cp++]=nx;pc=p[nx-2]|(p[nx-1]<<8);break;
   case 52:if(cp===0)return done(8);pc=C[--cp];break;
   case 64:{if(sp<1)return done(2);const a=S[sp-1];if(a<0||a>255)return done(6);S[sp-1]=M[a];break;}
   case 65:{if(sp<2)return done(2);const a=S[sp-1],v=S[sp-2];if(a<0||a>255)return done(6);M[a]=v;sp-=2;break;}
   case 80:{if(sp<1)return done(2);const s=String(S[sp-1]);if(o.length+s.length>65536)return done(11);sp--;for(let i=0;i<s.length;i++)o.push(s.charCodeAt(i));break;}
   case 81:{if(sp<1)return done(2);if(o.length+1>65536)return done(11);o.push(S[--sp]&255);break;}
   case 82:if(sp>=256)return done(3);S[sp++]=ip<g.length?g[ip++]:-1;break;
   case 83:if(sp<1)return done(2);return done(S[--sp]&255);
   default:return done(5);
  }
 }
}
for(const id of readdirSync(IND).sort()){
 let p,g;
 try{p=readFileSync(join(IND,id,'program.bin'));}catch{continue;}
 try{g=readFileSync(join(IND,id,'input.bin'));}catch{g=Buffer.alloc(0);}
 const r=run(p,g);
 mkdirSync(join(OUTD,id),{recursive:true});
 writeFileSync(join(OUTD,id,'stdout.bin'),r.stdout);
 writeFileSync(join(OUTD,id,'exit.txt'),String(r.exit)+'\n');
}
