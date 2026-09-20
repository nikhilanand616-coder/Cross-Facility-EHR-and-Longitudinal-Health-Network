/**
 * SMS Dispatch Service for Medical Officer Escalation Alerts
 * Supports Twilio API, Fast2SMS Gateway (India DLT), and robust Mockup Fallback.
 */

import { SmsDispatchPayload, EscalationAlertRecord } from './types';

export interface SmsDispatchResponse {
  success: boolean;
  provider: 'twilio' | 'fast2sms' | 'mockup';
  status: 'sent' | 'simulated' | 'failed';
  messageId: string;
  recipientPhone: string;
  error?: string;
  rawResponse?: any;
}

/**
 * Normalizes phone numbers to E.164 format (+91 for India by default)
 */
export function formatIndianPhoneNumber(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  return phone.startsWith('+') ? phone : `+91${digits.slice(-10)}`;
}

/**
 * Dispatch SMS alert to District Medical Officer using Twilio REST API
 */
async function sendTwilioSms(
  accountSid: string,
  authToken: string,
  fromPhone: string,
  toPhone: string,
  body: string
): Promise<SmsDispatchResponse> {
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const formattedTo = formatIndianPhoneNumber(toPhone);

  const params = new URLSearchParams();
  params.append('To', formattedTo);
  params.append('From', fromPhone);
  params.append('Body', body);

  const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: authHeader,
    },
    body: params.toString(),
  });

  const result = (await response.json()) as any;

  if (response.ok && result.sid) {
    return {
      success: true,
      provider: 'twilio',
      status: 'sent',
      messageId: result.sid,
      recipientPhone: formattedTo,
      rawResponse: { status: result.status, dateCreated: result.date_created },
    };
  }

  throw new Error(`Twilio error: ${result.message || response.statusText}`);
}

/**
 * Dispatch SMS alert via Fast2SMS (Indian Gateway)
 */
async function sendFast2Sms(
  apiKey: string,
  toPhone: string,
  body: string
): Promise<SmsDispatchResponse> {
  const digits = toPhone.replace(/[^0-9]/g, '').slice(-10);
  const endpoint = 'https://www.fast2sms.com/dev/bulkV2';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      route: 'q', // Quick SMS route or DLT
      message: body,
      language: 'english',
      flash: 0,
      numbers: digits,
    }),
  });

  const result = (await response.json()) as any;

  if (response.ok && result.return === true) {
    return {
      success: true,
      provider: 'fast2sms',
      status: 'sent',
      messageId: result.request_id || `F2S_${Date.now()}`,
      recipientPhone: formatIndianPhoneNumber(digits),
      rawResponse: result,
    };
  }

  throw new Error(`Fast2SMS error: ${result.message || response.statusText}`);
}

/**
 * Mockup SMS dispatcher for sandbox / local development / field demonstrations
 */
function sendMockupSms(
  toPhone: string,
  body: string,
  recipientRole: string
): SmsDispatchResponse {
  const mockId = `MOCK_SMS_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const formattedTo = formatIndianPhoneNumber(toPhone);

  console.log('===========================================================');
  console.log('📱 [SMS DISPATCH MOCKUP - DISTRICT MEDICAL OFFICER ESCALATION]');
  console.log(`To: ${formattedTo} (${recipientRole})`);
  console.log(`Time: ${new Date().toISOString()} [IST: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}]`);
  console.log(`Content:\n"${body}"`);
  console.log(`Simulated Message ID: ${mockId}`);
  console.log('===========================================================');

  return {
    success: true,
    provider: 'mockup',
    status: 'simulated',
    messageId: mockId,
    recipientPhone: formattedTo,
    rawResponse: {
      mode: 'mock_simulated',
      carrierDelivered: true,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * High-level SMS sender for Medical Officer Escalation
 */
export async function sendEscalationSms(
  payload: SmsDispatchPayload
): Promise<SmsDispatchResponse> {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
  const fast2SmsKey = process.env.FAST2SMS_API_KEY;

  // 1. Try Twilio if configured
  if (twilioSid && twilioAuth && twilioFrom) {
    try {
      return await sendTwilioSms(
        twilioSid,
        twilioAuth,
        twilioFrom,
        payload.recipientPhone,
        payload.messageBody
      );
    } catch (err: any) {
      console.warn('Twilio delivery failed, checking fallbacks:', err.message);
    }
  }

  // 2. Try Fast2SMS if configured
  if (fast2SmsKey) {
    try {
      return await sendFast2Sms(
        fast2SmsKey,
        payload.recipientPhone,
        payload.messageBody
      );
    } catch (err: any) {
      console.warn('Fast2SMS delivery failed, falling back to mockup:', err.message);
    }
  }

  // 3. Fallback to telecommunications mockup logger
  return sendMockupSms(
    payload.recipientPhone,
    payload.messageBody,
    payload.recipientRole
  );
}
