#ifndef PAGESTACK_HH
#define PAGESTACK_HH

#include <QStackedWidget>

enum PAGE_IDX {
    PAGE_IDX_LOGIN = 0,
    PAGE_IDX_SIGNUP = 1,
    PAGE_IDX_HOME = 2,
    PAGE_IDX_PROLEM = 3,
    PAGE_IDX_ACCOUNT = 4
};

class LoginPage;
class SignupPage;
class HomePage;
class ProblemPage;
class AccountPage;

class PageStack : public QStackedWidget
{
    Q_OBJECT
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
