#ifndef WINDOW_HH
#define WINDOW_HH

#include <QMainWindow>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QTextEdit>
#include <QPushButton>

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

    QPushButton *btnSignUp;

public:
    Window(QWidget *_parent = nullptr);
    ~Window();

    void allocContents();
    void setContents();
};
#endif // WINDOW_HH
