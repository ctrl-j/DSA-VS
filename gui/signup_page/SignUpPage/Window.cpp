#include "Window.hh"

Window::~Window() {


}

Window::Window(QWidget *_parent)
    : QMainWindow(_parent)
{
    resize(QSize(800, 600));

    allocContents();
    setContents();


}

void Window::allocContents() {
    CW = new QWidget();

    lblSignUp = new QLabel("Sign up for a new DSA-VS account 😇");

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

void Window::setContents() {
    // Setup username layout
    texUsername->setPlaceholderText("5-16 characters");
    lytUsername->addWidget(lblUsername);
    lytUsername->addWidget(texUsername);

    // Setup password layout
    texPassword->setPlaceholderText("IDK password requirements");
    lytPassword->addWidget(lblPassword);
    lytPassword->addWidget(texPassword);

    // Setup email layout
    texEmail->setPlaceholderText("IDK email requirements");
    lytEmail->addWidget(lblEmail);
    lytEmail->addWidget(texEmail);

    // Add other stuff 1


    // Setup main layout
    lytMain->addLayout(lytUsername);
    lytMain->addLayout(lytPassword);
    lytMain->addLayout(lytEmail);

    // Add other stuff 2


    // Set main layout stuff
    CW->setLayout(lytMain);
    setCentralWidget(CW);
}
