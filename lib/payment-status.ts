export function compareAmount(amount:number|null,total:number){
  if(amount===null)return {status:'OCR_FAILED',message:'Unable to automatically read the payment slip. Our team will verify it manually.'};
  if(amount===total)return {status:'AMOUNT_MATCHED',message:'Payment amount matches your order total. Your payment proof has been submitted for verification.'};
  return {status:'AMOUNT_MISMATCH',message:amount<total?'Payment amount appears to be lower than the order total. Please upload the correct payment proof.':'Payment amount differs from your order total. Our team will review it manually.'};
}
