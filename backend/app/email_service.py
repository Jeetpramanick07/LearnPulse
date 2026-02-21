import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

GMAIL_SENDER = os.getenv("GMAIL_SENDER")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")
ALERT_RECIPIENT_EMAIL = os.getenv("ALERT_RECIPIENT_EMAIL")

def send_risk_alert(student_name, roll, dept, risk_score, risk_level, recipient_email=None):
    try:
        recipient = recipient_email or ALERT_RECIPIENT_EMAIL
        if not recipient:
            print("No recipient email configured.")
            return False

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"⚠️ High Risk Alert: {student_name} ({roll})"
        msg["From"] = GMAIL_SENDER
        msg["To"] = recipient

        risk_color = "#EF4444" if risk_level == "HIGH" else "#F59E0B"

        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background: #f9fafb; padding: 20px;">
            <div style="max-width: 600px; margin: auto; background: white;
                        border-radius: 8px; border: 1px solid #e5e7eb;">
                <div style="background: #7c3aed; padding: 20px 30px;">
                    <h1 style="color: white; margin: 0; font-size: 20px;">🎓 LearnPulse</h1>
                    <p style="color: #ddd6fe; margin: 4px 0 0;">Academic Risk Alert</p>
                </div>
                <div style="padding: 30px;">
                    <p style="color: #374151;">
                        A student has been flagged as
                        <strong style="color:{risk_color};">{risk_level} RISK</strong>.
                    </p>
                    <div style="text-align:center; margin: 24px 0;">
                        <div style="display:inline-block; background:{risk_color}20;
                                    border: 2px solid {risk_color}; border-radius:12px;
                                    padding:16px 32px;">
                            <p style="margin:0; font-size:13px; color:#6b7280;">RISK SCORE</p>
                            <p style="margin:4px 0 0; font-size:36px; font-weight:bold;
                                      color:{risk_color};">{risk_score}%</p>
                            <p style="margin:2px 0 0; font-size:12px; color:{risk_color};
                                      font-weight:bold;">{risk_level}</p>
                        </div>
                    </div>
                    <table style="width:100%; border-collapse:collapse;">
                        <tr style="background:#f9fafb;">
                            <td style="padding:12px 16px; color:#6b7280; font-size:13px;
                                       border-bottom:1px solid #e5e7eb;">Student Name</td>
                            <td style="padding:12px 16px; font-weight:bold; font-size:13px;
                                       border-bottom:1px solid #e5e7eb;">{student_name}</td>
                        </tr>
                        <tr>
                            <td style="padding:12px 16px; color:#6b7280; font-size:13px;
                                       border-bottom:1px solid #e5e7eb;">Roll Number</td>
                            <td style="padding:12px 16px; font-size:13px;
                                       border-bottom:1px solid #e5e7eb;">{roll}</td>
                        </tr>
                        <tr style="background:#f9fafb;">
                            <td style="padding:12px 16px; color:#6b7280; font-size:13px;">Department</td>
                            <td style="padding:12px 16px; font-size:13px;">{dept}</td>
                        </tr>
                    </table>
                    <p style="color:#6b7280; font-size:13px; margin-top:24px;">
                        Please log in to LearnPulse to review this student's performance.
                    </p>
                </div>
                <div style="background:#f9fafb; padding:16px 30px; border-top:1px solid #e5e7eb;">
                    <p style="color:#9ca3af; font-size:12px; margin:0;">
                        Automated alert from LearnPulse Academic Risk Platform.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_SENDER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_SENDER, recipient, msg.as_string())

        print(f"Alert sent to {recipient} for {student_name}")
        return True

    except Exception as e:
        print(f"Failed to send email: {e}")
        return False