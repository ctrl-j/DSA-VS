#include "SignupPage.hh"

#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QTextEdit>
#include <QPushButton>

SignupPage::SignupPage(QWidget *parent) : QWidget(parent)
{
    allocContents();
    setSizePolicies();
    setContents();
}

void SignupPage::allocContents() {
    lblSignUp = new QLabel("Sign up for a new DSA-VS account 😇");
    btnSignUp = new QPushButton("Sign Up");
    lblErrors = new QLabel("");

    lytMain = new QVBoxLayout();

    lytUsername = new QHBoxLayout();
    lblUsername = new QLabel("Create a Username: ");
    texUsername = new QTextEdit();

    lytPassword = new QHBoxLayout();
    lblPassword = new QLabel("Create a Password: ");
    texPassword = new QTextEdit();

    lytEmail = new QHBoxLayout();
    lblEmail = new QLabel("Enter your email address: ");
    texEmail = new QTextEdit();
}
void SignupPage::setSizePolicies() {
    lblUsername->setSizePolicy(QSizePolicy::Minimum, QSizePolicy::Fixed);
    texUsername->setSizePolicy(QSizePolicy::Minimum, QSizePolicy::Fixed);

    lblPassword->setSizePolicy(QSizePolicy::Minimum, QSizePolicy::Fixed);
    texPassword->setSizePolicy(QSizePolicy::Minimum, QSizePolicy::Fixed);

    lblEmail->setSizePolicy(QSizePolicy::Minimum, QSizePolicy::Fixed);
    texEmail->setSizePolicy(QSizePolicy::Minimum, QSizePolicy::Fixed);
}
void SignupPage::setContents() {
    QSpacerItem *spacer1 = new QSpacerItem(10, 35);
    QSpacerItem *spacer2 = new QSpacerItem(10, 35);
    QSpacerItem *spacer3 = new QSpacerItem(10, 35);

    // Setup username layout
    texUsername->setPlaceholderText("5-16 characters");
    lytUsername->addWidget(lblUsername, 0, Qt::AlignLeft);
    lytUsername->addWidget(texUsername, 0, Qt::AlignRight);

    // Setup password layout
    texPassword->setPlaceholderText("IDK password requirements");
    lytPassword->addWidget(lblPassword, 0, Qt::AlignLeft);
    lytPassword->addWidget(texPassword, 0, Qt::AlignRight);

    // Setup email layout
    texEmail->setPlaceholderText("IDK email requirements");
    lytEmail->addWidget(lblEmail, 0, Qt::AlignLeft);
    lytEmail->addWidget(texEmail, 0, Qt::AlignRight);

    // Add other stuff 1
    QFont f = lblSignUp->font();
    f.setPointSize(22);
    lblSignUp->setFont(f);
    lytMain->addWidget(lblSignUp, 0, Qt::AlignCenter);

    // Setup main layout
    lytMain->addLayout(lytUsername);
    lytMain->addSpacerItem(spacer1);
    lytMain->addLayout(lytPassword);
    lytMain->addSpacerItem(spacer2);
    lytMain->addLayout(lytEmail);

    // Add other stuff 2
    lytMain->addWidget(lblErrors);
    lytMain->addSpacerItem(spacer3);
    lytMain->addWidget(btnSignUp);

    // Set main layout stuff
    this->setLayout(lytMain);
    lytMain->setSizeConstraint(QLayout::SetMinAndMaxSize);
}

bool SignupPage::validateUsername() {

    return true;
}
bool SignupPage::validatePassword() {

    return true;
}
bool SignupPage::validateEmail() {

    return true;
}

QString SignupPage::getUsernameText() {
    return texUsername->toPlainText();
}
QString SignupPage::getPasswordText() {
    return texPassword->toPlainText();
}
QString SignupPage::getEmailText() {
    return texEmail->toPlainText();
}
