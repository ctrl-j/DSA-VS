#include "LoginPage.hh"

#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QTextEdit>
#include <QPushButton>

LoginPage::LoginPage(QWidget *parent) : QWidget(parent)
{
    allocContents();
    setSizePolicies();
    setContents();
}

void LoginPage::allocContents() {
    lblLogin = new QLabel("Log in to an existing DSA-VS account 😇");
    lblErrors = new QLabel("");

    lytMain = new QVBoxLayout();

    lytUsername = new QHBoxLayout();
    lblUsername = new QLabel("Username: ");
    texUsername = new QTextEdit();

    lytPassword = new QHBoxLayout();
    lblPassword = new QLabel("Password: ");
    texPassword = new QTextEdit();

    lytButtons = new QHBoxLayout();
    btnLogin = new QPushButton("Log in");
    btnSignup = new QPushButton("Create new account");
}
void LoginPage::setSizePolicies() {
    lblUsername->setSizePolicy(QSizePolicy::Minimum, QSizePolicy::Fixed);
    texUsername->setSizePolicy(QSizePolicy::Minimum, QSizePolicy::Fixed);

    lblPassword->setSizePolicy(QSizePolicy::Minimum, QSizePolicy::Fixed);
    texPassword->setSizePolicy(QSizePolicy::Minimum, QSizePolicy::Fixed);
}
void LoginPage::setContents() {
    QSpacerItem *spacer1 = new QSpacerItem(10, 35);
    QSpacerItem *spacer2 = new QSpacerItem(10, 35);
    QSpacerItem *spacer3 = new QSpacerItem(10, 35);

    // Setup username layout
    lytUsername->addWidget(lblUsername, 0, Qt::AlignLeft);
    lytUsername->addWidget(texUsername, 0, Qt::AlignRight);

    // Setup password layout
    lytPassword->addWidget(lblPassword, 0, Qt::AlignLeft);
    lytPassword->addWidget(texPassword, 0, Qt::AlignRight);

    // Add other stuff 1
    QFont f = lblLogin->font();
    f.setPointSize(22);
    lblLogin->setFont(f);
    lytMain->addWidget(lblLogin, 0, Qt::AlignCenter);

    // Setup main layout
    lytMain->addLayout(lytUsername);
    lytMain->addSpacerItem(spacer1);
    lytMain->addLayout(lytPassword);
    lytMain->addSpacerItem(spacer2);

    // Add other stuff 2
    lytMain->addWidget(lblErrors);
    lytMain->addSpacerItem(spacer3);

    lytButtons->addWidget(btnLogin);
    lytButtons->addWidget(btnSignup);
    lytMain->addLayout(lytButtons);

    // Set main layout stuff
    this->setLayout(lytMain);
    lytMain->setSizeConstraint(QLayout::SetMinAndMaxSize);
}

bool LoginPage::validateUsername() {

    return true;
}
bool LoginPage::validatePassword() {

    return true;
}

QString LoginPage::getUsernameText() {
    return texUsername->toPlainText();
}
QString LoginPage::getPasswordText() {
    return texPassword->toPlainText();
}
