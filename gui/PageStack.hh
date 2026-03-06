#ifndef PAGESTACK_HH
#define PAGESTACK_HH

#include <QStackedWidget>

class LoginPage;
class SignupPage;
class HomePage;
class ProblemPage;
class AccountPage;

class PageStack : public QStackedWidget
{
private:
    LoginPage *page_login;
    SignupPage *page_signup;
    HomePage *page_home;
    ProblemPage *page_problem;
    AccountPage *page_account;

public:
    PageStack(QWidget *parent = nullptr);

    int initPages();
    int initStack();
};

#endif // PAGESTACK_HH
