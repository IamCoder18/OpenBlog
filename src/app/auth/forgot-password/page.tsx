import ForgotPasswordClient from "./ForgotPasswordClient";
import { smtpConfiguration } from "@/lib/smtp";

export default function ForgotPasswordPage() {
  return (
    <ForgotPasswordClient emailDeliveryAvailable={smtpConfiguration !== null} />
  );
}
