#ifndef WINDOW_HH
#define WINDOW_HH

#include <QMainWindow>
#include <QHBoxLayout>
#include <QLabel>
#include <QPushButton>
#include <QTextEdit>
#include <QVBoxLayout>

class Window : public QMainWindow
{
    Q_OBJECT
private:
    QMainWindow *parent;
    QWidget *CW;

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
    Window(QWidget *_parent = nullptr);
    ~Window();

    void allocContents();
    void setSizePolicies();
    void setContents();

    bool validateUsername();
    bool validatePassword();
    bool validateEmail();
};
#endif // WINDOW_HH
