#ifndef CHANGEPASSWORDDIALOG_H
#define CHANGEPASSWORDDIALOG_H

#include <QDialog>
#include <QLineEdit>
#include <QLabel>
#include <QPushButton>
#include <QVBoxLayout>
#include <QDialogButtonBox>

class changePasswordDialog : public QDialog
{
    Q_OBJECT

public:
    explicit changePasswordDialog(QWidget *parent = nullptr);
    ~changePasswordDialog();

    QString getOldPassword() const { return oldPassword->text(); }
    QString getNewPassword() const { return newPassword->text(); }

private slots:
    void validInputs();
    void sendEmail();
private:
    QLineEdit *oldPassword;
    QLineEdit *newPassword;
    QLineEdit *confirmPassword;

    QPushButton *btnSendEmail;
    QLabel *passwordMismatch;

    QDialogButtonBox *confirm;
};

#endif // CHANGEPASSWORDDIALOG_H
