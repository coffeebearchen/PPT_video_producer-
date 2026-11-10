export type ExplanationStyle = 'industrial'|'clean'|'dynamic';
export const EXPLANATION_STYLES = {
 industrial:{label:'严谨工业风',bg:'#0B1210',surface:'#111A16',ink:'#ECF0E4',muted:'#A4B0A6',primary:'#AEC56B',accent:'#D99C4A',line:'#3F5145',heading:'LXGW WenKai',radius:4},
 clean:{label:'简洁风格',bg:'#F4F1E9',surface:'#FBFAF6',ink:'#253B34',muted:'#62766B',primary:'#497F70',accent:'#BD713E',line:'#B8C6BA',heading:'LXGW WenKai',radius:20},
 dynamic:{label:'活泼动感风',bg:'#122C2B',surface:'#1E3B37',ink:'#F5EFD9',muted:'#ADC7BA',primary:'#D7DC78',accent:'#F29B70',line:'#527B6F',heading:'ZCOOL KuaiLe',radius:24},
};
export const styleTokens=(style:ExplanationStyle='industrial')=>EXPLANATION_STYLES[style]??EXPLANATION_STYLES.industrial;
