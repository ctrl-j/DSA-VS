#include "PageStack.hh"

#include "AccountPage.hh"
#include "HomePage.hh"
#include "LoginPage.hh"
#include "ProblemPage.hh"
#include "SignupPage.hh"

PageStack::PageStack(QWidget *parent) : QStackedWidget(parent)
{
    if (initPages()) return;
    if (initStack()) return;

    // Always start on the login page
    this->setCurrentIndex(PAGE_IDX_LOGIN);
}

int PageStack::initPages() {
    page_login = new LoginPage();
    page_signup = new SignupPage();
    page_home = new HomePage();
    page_problem = new ProblemPage();
    page_account = new AccountPage();

    return 0;
}

int PageStack::initStack() {
    // Add all the page objects to the stack
    addWidget(page_login);
    addWidget(page_signup);
    addWidget(page_home);
    addWidget(page_problem);
    addWidget(page_account);

    return 0;
}
