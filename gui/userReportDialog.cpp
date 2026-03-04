#include "userReportDialog.h"

OptionsDialog::OptionsDialog(QWidget *parent)
    : QDialog(parent)
{
    setWindowTitle("Report User");
    setMinimumWidth(250);
    QVBoxLayout *layout = new QVBoxLayout(this);

    //Boxes to check for reporting reason
    cheating = new QCheckBox("Cheating", this);
    leftGame = new QCheckBox("Leaving the game", this);
    chatAbuse = new QCheckBox("Abusing Chat", this);
    offensiveName = new QCheckBox("Offensive Name", this);

    layout->addWidget(cheating);
    layout->addWidget(leftGame);
    layout->addWidget(chatAbuse);
    layout->addWidget(offensiveName);

    //Text box for additional context if needed
    textBox = new QTextEdit(this);
    textBox->setPlaceholderText("Add any additional context on"
                                " what led to the report here if necessary...");
    textBox->setFixedHeight(70);
    layout->addWidget(textBox);

    //Submit / Cancel
    confirm = new QDialogButtonBox(
        QDialogButtonBox::Ok | QDialogButtonBox::Cancel, this);
    layout->addWidget(confirm);
    //grey out confirm option
    confirm->button(QDialogButtonBox::Ok)->setEnabled(false);
    //check and see if an option has been selected
    connect(cheating, &QCheckBox::checkStateChanged, this, &OptionsDialog::checkSelection);
    connect(leftGame, &QCheckBox::checkStateChanged, this, &OptionsDialog::checkSelection);
    connect(chatAbuse, &QCheckBox::checkStateChanged, this, &OptionsDialog::checkSelection);
    connect(offensiveName, &QCheckBox::checkStateChanged, this, &OptionsDialog::checkSelection);

    connect(confirm, &QDialogButtonBox::accepted, this, &QDialog::accept);
    connect(confirm, &QDialogButtonBox::rejected, this, &QDialog::reject);
}

void OptionsDialog::checkSelection()
{
    bool checked = cheating->isChecked() ||
                   leftGame->isChecked() ||
                   chatAbuse->isChecked() ||
                   offensiveName->isChecked();
    confirm->button(QDialogButtonBox::Ok)->setEnabled(checked);
}

OptionsDialog::~OptionsDialog()
{}
