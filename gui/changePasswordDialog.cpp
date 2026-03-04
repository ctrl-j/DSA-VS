#include "changePasswordDialog.h"
#include "ui_changePasswordDialog.h"

changePasswordDialog::changePasswordDialog(QWidget *parent)
    : QDialog(parent)
{
    // Window title and size
    setWindowTitle("Change Password");
    setMinimumWidth(600);

    QVBoxLayout *layout = new QVBoxLayout(this);

    // Old password with password dots and placeholder text
    layout->addWidget(new QLabel("Current Password", this));
    oldPassword = new QLineEdit(this);
    oldPassword->setEchoMode(QLineEdit::Password);
    oldPassword->setPlaceholderText("Enter current password...");
    layout->addWidget(oldPassword);
    // Forgot Password button
    btnSendEmail = new QPushButton("Forgot password? Email verification", this);
    layout->addWidget(btnSendEmail);
    layout->addSpacing(15);

    // New password
    layout->addWidget(new QLabel("New Password", this));
    newPassword = new QLineEdit(this);
    newPassword->setEchoMode(QLineEdit::Password);
    newPassword->setPlaceholderText("Enter new password...");
    layout->addWidget(newPassword);

    // Confirm new password
    layout->addWidget(new QLabel("Confirm Password", this));
    confirmPassword = new QLineEdit(this);
    confirmPassword->setEchoMode(QLineEdit::Password);
    confirmPassword->setPlaceholderText("Enter new password...");
    layout->addWidget(confirmPassword);

    // New passwords don't match
    passwordMismatch = new QLabel("Passwords do not match", this);
    passwordMismatch->setStyleSheet("color:red, font_size:12px");
    passwordMismatch->setVisible(false);
    layout->addWidget(passwordMismatch);

    //Submit / Cancel
    confirm = new QDialogButtonBox(
        QDialogButtonBox::Ok | QDialogButtonBox::Cancel, this);
    layout->addWidget(confirm);
    // Grey until fields all valid
    confirm->button(QDialogButtonBox::Ok)->setEnabled(false);

    // When fields are updated recheck if valid
    connect(oldPassword, &QLineEdit::textChanged, this, &changePasswordDialog::validInputs);
    connect(newPassword, &QLineEdit::textChanged, this, &changePasswordDialog::validInputs);
    connect(confirmPassword, &QLineEdit::textChanged, this, &changePasswordDialog::validInputs);

    connect(btnSendEmail, &QPushButton::clicked, this, &changePasswordDialog::sendEmail);

    connect(confirm, &QDialogButtonBox::accepted, this, &QDialog::accept);
    connect(confirm, &QDialogButtonBox::rejected, this, &QDialog::reject);
}

void changePasswordDialog::validInputs()
{
    // add logic to get current password from backend and check if match
    bool oldPass = !oldPassword->text().isEmpty();

    bool newPass =!newPassword->text().isEmpty();
    bool match = newPassword->text() == confirmPassword->text();

    // Show mismatch message when something is typed in
    // confirmPassword and it doesn't match with newPassword
    bool error = !confirmPassword->text().isEmpty() && !match;
    passwordMismatch->setVisible(error);
    confirm->button(QDialogButtonBox::Ok)->setEnabled(oldPass && newPass && match);
}

void changePasswordDialog::sendEmail()
{
    // add logic to get email and send
    btnSendEmail->setText("Email Sent");
    btnSendEmail->setEnabled(false);
}

changePasswordDialog::~changePasswordDialog()
{
}
