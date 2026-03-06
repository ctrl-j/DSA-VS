#ifndef LOGINPAGE_HH
#define LOGINPAGE_HH

#include <QWidget>

class QVBoxLayout;
class QHBoxLayout;
class QLabel;
class QTextEdit;
class QPushButton;

class LoginPage : public QWidget
{
    Q_OBJECT
private:
    QVBoxLayout *lytMain;
    QLabel *lblLogin;

    QHBoxLayout *lytUsername;
    QLabel *lblUsername;
    QTextEdit *texUsername;

    QHBoxLayout *lytPassword;
    QLabel *lblPassword;
    QTextEdit *texPassword;

    QLabel *lblErrors;

    QHBoxLayout *lytButtons;
    QPushButton *btnLogin;
    QPushButton *btnSignup;

public:
    LoginPage(QWidget *parent = nullptr);

    void allocContents();
    void setSizePolicies();
    void setContents();

    bool validateUsername();
    bool validatePassword();

    QString getUsernameText();
    QString getPasswordText();
};

#endif // LOGINPAGE_HH
