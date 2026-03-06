#include "Window.hh"

#include <QSpacerItem>

Window::~Window() {


}

Window::Window(QWidget *_parent)
    : QMainWindow(_parent)
{
    resize(QSize(800, 600));

    allocContents();
    setSizePolicies();
    setContents();
}

void Window::allocContents() {
    CW = new QWidget();

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

void Window::setSizePolicies() {
    lblUsername->setSizePolicy(QSizePolicy::Minimum, QSizePolicy::Fixed);
    texUsername->setSizePolicy(QSizePolicy::Minimum, QSizePolicy::Fixed);

    lblPassword->setSizePolicy(QSizePolicy::Minimum, QSizePolicy::Fixed);
    texPassword->setSizePolicy(QSizePolicy::Minimum, QSizePolicy::Fixed);

    lblEmail->setSizePolicy(QSizePolicy::Minimum, QSizePolicy::Fixed);
    texEmail->setSizePolicy(QSizePolicy::Minimum, QSizePolicy::Fixed);
}

void Window::setContents() {
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
    CW->setLayout(lytMain);
    setCentralWidget(CW);
    lytMain->setSizeConstraint(QLayout::SetMinAndMaxSize);
}
