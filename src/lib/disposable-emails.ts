// Common disposable / temporary email domains. Not exhaustive, but blocks
// the most-used providers people reach for to bypass sign-up.
const DISPOSABLE_DOMAINS = new Set<string>([
  "mailinator.com","10minutemail.com","10minutemail.net","guerrillamail.com",
  "guerrillamail.net","guerrillamail.org","guerrillamail.biz","guerrillamailblock.com",
  "sharklasers.com","grr.la","spam4.me","pokemail.net","yopmail.com","yopmail.fr",
  "yopmail.net","cool.fr.nf","jetable.fr.nf","nospam.ze.tc","nomail.xl.cx",
  "mega.zik.dj","speed.1s.fr","courriel.fr.nf","moncourrier.fr.nf","monemail.fr.nf",
  "monmail.fr.nf","trashmail.com","trashmail.net","trashmail.io","trashmail.me",
  "trashmail.de","trbvm.com","tempmail.com","tempmail.net","tempmail.us.com",
  "temp-mail.org","temp-mail.io","tempinbox.com","tempinbox.co.uk","tempail.com",
  "tmpmail.org","tmpmail.net","tmpeml.info","tmpbox.net","dispostable.com",
  "throwawaymail.com","throwaway.email","fakeinbox.com","fakemailgenerator.com",
  "getnada.com","nada.email","mytrashmail.com","maildrop.cc","mailnesia.com",
  "mailcatch.com","mailtemp.info","mail-temporaire.fr","emailondeck.com",
  "mintemail.com","spambox.us","spambog.com","spambog.ru","spambog.de",
  "byom.de","discard.email","harakirimail.com","incognitomail.com",
  "meltmail.com","mvrht.com","mytemp.email","mohmal.com","mohmal.in",
  "mytempemail.com","instaddr.win","tafmail.com","tempr.email","fake-mail.net",
  "fake-mail.ml","emlpro.com","emlhub.com","1secmail.com","1secmail.net",
  "1secmail.org","33mail.com","anonaddy.me","addy.io","simplelogin.io",
  "duckduckgo.com","proton.me.temp","tempmailaddress.com","tempmails.net",
  "temporary-mail.net","tempmail.plus","tempmailo.com","tempsky.com",
  "email-fake.com","email-temp.com","emailtemporario.com.br","luxusmail.org",
  "linshiyou.com","linshiyouxiang.net","yepmail.net","yentzn.com",
  "instantemailaddress.com","boximail.com","spamgourmet.com","zetmail.com"
]);

export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}
