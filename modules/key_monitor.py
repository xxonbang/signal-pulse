"""
API 키 에러 모니터링 및 알림
- record_alert(): 메모리에 alert 누적
- flush_alerts(): JSON 저장 + 이메일 발송
"""
import json
import os
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from pathlib import Path

KST = timezone(timedelta(hours=9))

_alerts: list[dict] = []


def record_alert(source: str, key_name: str, error_type: str, message: str):
    """에러 alert를 메모리에 추가"""
    _alerts.append({
        "timestamp": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S"),
        "source": source,
        "key_name": key_name,
        "error_type": error_type,
        "message": message,
    })


def flush_alerts(results_dir: Path):
    """누적된 alerts를 JSON 저장 + 이메일 발송 후 초기화"""
    if not _alerts:
        return

    # JSON 저장
    system_dir = results_dir / "system"
    system_dir.mkdir(parents=True, exist_ok=True)

    data = {
        "updated_at": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S"),
        "alerts": list(_alerts),
    }

    alerts_path = system_dir / "key_alerts.json"
    with open(alerts_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[KEY_MONITOR] {len(_alerts)}건의 키 에러 알림 저장: {alerts_path}")

    # 이메일 발송
    smtp_user = os.environ.get("ALERT_SMTP_USER")
    smtp_password = os.environ.get("ALERT_SMTP_PASSWORD")
    if smtp_user and smtp_password:
        try:
            _send_email_alert(list(_alerts), smtp_user, smtp_password)
        except Exception as e:
            print(f"[KEY_MONITOR] 이메일 발송 실패: {e}")

    _alerts.clear()


def _send_email_alert(alerts: list[dict], smtp_user: str, smtp_password: str):
    """Gmail SMTP로 알림 이메일 발송"""
    recipient = "mackulri@gmail.com"
    subject = f"[SignalPulse] API 키 에러 {len(alerts)}건"

    lines = [f"API 키 에러 {len(alerts)}건이 감지되었습니다.\n"]
    for a in alerts:
        lines.append(
            f"- [{a['timestamp']}] {a['source']} / {a['key_name']} / "
            f"{a['error_type']}: {a['message']}"
        )

    body = "\n".join(lines)

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = recipient

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, [recipient], msg.as_string())

    print(f"[KEY_MONITOR] 이메일 발송 완료 → {recipient}")
