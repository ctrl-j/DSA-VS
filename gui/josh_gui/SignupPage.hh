#ifndef SIGNUPPAGE_HH
#define SIGNUPPAGE_HH

#include <QWidget>

class QVBoxLayout;
class QHBoxLayout;
class QLabel;
class QTextEdit;
class QPushButton;

class SignupPage : public QWidget
{
    Q_OBJECT
private:
    QVBoxLayout *lytMain;
    QLabel *lblSignUp;

    QHBoxLayout *lytUsername;
    QLabel *lblUsername;
    QTextEdit *texUsername;

    QHBoxLayout *lytPassword;
    QLabel *lblPassword;
    QTextEdit *texPassword;

    QHBoxLayout *lytEmail;
    QLabel *lblEmail;
    QTextEdit *texEmail;

    QLabel *lblErrors;

    QPushButton *btnSignUp;

public:
    SignupPage(QWidget *parent = nullptr);

    void allocContents();
    void setSizePolicies();
    void setContents();

    bool validateUsername();
    bool validatePassword();
    bool validateEmail();

    QString getUsernameText();
    QString getPasswordText();
    QString getEmailText();
};

#endif // SIGNUPPAGE_HH
