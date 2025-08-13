from flask import Flask, request, render_template, jsonify
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import re

app = Flask(__name__)

# Configuration SMTP Gmail
SMTP_SERVER = 'smtp.gmail.com'
SMTP_PORT = 587
FROM_EMAIL = "adjouadeleke@gmail.com"          # Ton adresse Gmail
FROM_PASSWORD =  "mkhy hamh jwmv ziuf"        
ADMIN_EMAIL = "ofbeninyoungleaders@gmail.com" # Email admin pour recevoir les messages

def is_valid_email(email):
    return re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", email)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/contact', methods=['POST'])
def contact():
    name = request.form.get('user-name', '').strip()
    email = request.form.get('user-email', '').strip()

    if not name or not email:
        return jsonify({'status': 'error', 'message': 'Nom et email obligatoires'}), 400

    if not is_valid_email(email):
        return jsonify({'status': 'error', 'message': 'Email invalide'}), 400

    try:
        html_content = f"""
        <h2>Nouveau message de contact</h2>
        <p><strong>Nom :</strong> {name}</p>
        <p><strong>Email :</strong> {email}</p>
        """

        # Mail à l'admin
        send_mail(subject=f"Nouveau message de {name}", to_email=ADMIN_EMAIL, html_body=html_content)

        # Mail de confirmation à l'utilisateur
        confirmation_html = f"""
        <p>Bonjour {name},</p>
        <p>Merci pour votre message. Nous vous répondrons rapidement.</p>
        <hr>
        {html_content}
        """
        send_mail(subject="Confirmation de votre message", to_email=email, html_body=confirmation_html)

        return jsonify({'status': 'success', 'message': 'Message envoyé avec succès'}), 200
    except Exception as e:
        print(f"Erreur lors de l'envoi: {e}")
        return jsonify({'status': 'error', 'message': "Erreur lors de l'envoi du message"}), 500

def send_mail(subject, to_email, html_body):
    msg = MIMEMultipart()
    msg['From'] = FROM_EMAIL
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(html_body, 'html'))

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(FROM_EMAIL, FROM_PASSWORD)
        server.send_message(msg)

if __name__ == '__main__':
    app.run(debug=True)