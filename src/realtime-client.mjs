// No API secret is accepted by this browser adapter. Audio is remote API output only.
export function createVoiceClient({fetchImpl=globalThis.fetch,media=globalThis.navigator?.mediaDevices,Peer=globalThis.RTCPeerConnection,makeAudio=()=>new Audio(),onState=()=>{},onPhase=()=>{},secure=globalThis.isSecureContext,setTimer=setTimeout,clearTimer=clearTimeout}={}) {
 let generation=0,pc=null,stream=null,channel=null,audio=null,abort=null,deadline=null,connectingTimer=null,lesson=null,busy=false,pendingResponse=false,active=false,userSpeaking=false;
 const toolCalls=new Set();
 const state=(status,message='')=>onState({status,message});
 function dispose(){toolCalls.clear();active=false;abort?.abort();abort=null;clearTimer(deadline);clearTimer(connectingTimer);deadline=null;connectingTimer=null;channel?.close();channel=null;pc?.close();pc=null;stream?.getTracks().forEach(t=>t.stop());stream=null;if(audio){audio.pause();audio.srcObject=null;audio=null}busy=false;pendingResponse=false;userSpeaking=false;}
 function stop(message='语音已结束'){generation++;dispose();state('idle',message)}
 function fail(message){generation++;dispose();state('error',message)}
 function send(event){if(channel?.readyState==='open')channel.send(JSON.stringify(event));}
 function request(){if(busy||userSpeaking){pendingResponse=true;return}send({type:'response.create',response:{output_modalities:['audio']}});busy=true;state('thinking')}
 function eventReceived(raw){if(!active)return;let e;try{e=JSON.parse(raw)}catch{return}
  if(e.type==='input_audio_buffer.speech_started'){userSpeaking=true;state('listening')}
  if(e.type==='input_audio_buffer.speech_stopped')state('thinking');
  if(e.type==='input_audio_buffer.committed'){userSpeaking=false;pendingResponse=false;request()}
  if(e.type==='response.created'){busy=true;state('thinking')}
  if(e.type==='output_audio_buffer.started')state('speaking');
  if(e.type==='output_audio_buffer.stopped')state('listening');
  if(e.type==='response.done'){busy=false;if(e.response?.status==='failed'){fail('模型响应失败，请结束后重试。');return}if(pendingResponse){pendingResponse=false;request()}}
  if(e.type==='error'){fail('语音服务出错，连接和麦克风已关闭。');return}
  if(e.type==='response.function_call_arguments.done'&&e.name==='set_lesson_phase'){
   if(typeof e.call_id!=='string'||!e.call_id||e.call_id.length>=200||toolCalls.has(e.call_id))return;
   toolCalls.add(e.call_id);
   let ok=false;try{const a=JSON.parse(e.arguments);ok=Number.isInteger(a.phase)&&a.phase>=0&&a.phase<=5&&Object.keys(a).length===1;if(ok)onPhase(a.phase)}catch{}
   if(typeof e.call_id==='string'&&e.call_id.length<200){send({type:'conversation.item.create',item:{type:'function_call_output',call_id:e.call_id,output:JSON.stringify({accepted:ok})}});pendingResponse=true;}
  }
 }
 async function start(currentLesson,{adultTestConfirmed=false}={}){
  if(!adultTestConfirmed){stop('');state('blocked','只允许成人使用虚构情境测试，请先确认。');return}
  stop('');const g=generation;lesson=currentLesson;state('connecting');abort=new AbortController();
  connectingTimer=setTimer(()=>{if(g===generation)fail('连接超时，麦克风已关闭。')},30000);
  try{
   if(!secure||!media?.getUserMedia||!Peer)throw new Error('unsupported');
   const configResponse=await fetchImpl('/api/voice/status',{signal:abort.signal,cache:'no-store'});
   const config=await configResponse.json();if(g!==generation)return;
   if(!configResponse.ok||!config.ready||!config.enabled||!config.adultTestMode||config.childUseAllowed!==false){dispose();state('blocked','本地成人测试服务尚未启用；没有打开麦克风。');return}
   const acquired=await media.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
   if(g!==generation){acquired.getTracks().forEach(t=>t.stop());return}stream=acquired;
   pc=new Peer();audio=makeAudio();audio.autoplay=true;active=true;
   pc.ontrack=e=>{if(g!==generation)return;audio.srcObject=e.streams[0];Promise.resolve(audio.play()).catch(()=>{if(g===generation)fail('浏览器未允许播放声音，麦克风已关闭；请重新点击连接。')})};
   pc.onconnectionstatechange=()=>{if(g!==generation)return;if(['failed','disconnected','closed'].includes(pc?.connectionState))fail('语音连接中断，麦克风已关闭。')};
   stream.getTracks().forEach(t=>pc.addTrack(t,stream));channel=pc.createDataChannel('oai-events');
   channel.onmessage=e=>{if(g===generation)eventReceived(e.data)};
   channel.onclose=()=>{if(g===generation&&active)fail('语音通道已关闭。')};
   channel.onopen=()=>{if(g!==generation)return;clearTimer(connectingTimer);connectingTimer=null;state('thinking');send({type:'response.create',response:{output_modalities:['audio'],instructions:'请开始本课。先用中文主动简短打招呼并介绍今天观察什么，然后只问一个问题并等待回答。当前参与者是成人使用虚构情境测试。'}});busy=true;deadline=setTimer(()=>{if(g===generation)stop('已达到5分钟测试上限，连接已结束。')},300000)};
   const offer=await pc.createOffer();if(g!==generation)return;await pc.setLocalDescription(offer);
   if(g!==generation)return;
   const answer=await fetchImpl('/api/voice/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lessonId:lesson.id,sdp:offer.sdp,adultTestConfirmed:true}),signal:abort.signal});
   if(g!==generation)return;if(!answer.ok)throw new Error('server');const sdp=await answer.text();if(!sdp.startsWith('v=0'))throw new Error('sdp');if(g!==generation)return;await pc.setRemoteDescription({type:'answer',sdp});
  }catch(err){if(g!==generation)return;fail(err?.name==='NotAllowedError'?'未获得麦克风许可，没有继续连接。':'无法建立语音连接，请检查本地配置、网络和模型权限。')}
 }
 function select(index){if(!active||channel?.readyState!=='open'||!lesson||!Number.isInteger(index)||!lesson.choices[index])return false;send({type:'conversation.item.create',item:{type:'message',role:'user',content:[{type:'input_text',text:'我在页面选择了：'+lesson.choices[index]}]}});request();return true}
 return {start,stop,select};
}
