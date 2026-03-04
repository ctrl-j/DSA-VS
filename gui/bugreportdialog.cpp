#include "bugReportDialog.h"
#include "ui_bugReportDialog.h"

bugReportDialog::bugReportDialog(QWidget *parent)
    : QDialog(parent)
{
    setWindowTitle("Bug Report");
    setMinimumWidth(250);
    QVBoxLayout *layout = new QVBoxLayout(this);

    //Boxes to check for reporting reason
    instructionConfuse = new QCheckBox("Confusing / Misleading Instructions", this);
    brokenTest = new QCheckBox("Broken test case", this);
    uiProblem = new QCheckBox("UI / display issue", this);

    layout->addWidget(instructionConfuse);
    layout->addWidget(brokenTest);
    layout->addWidget(uiProblem);

    //Text box for additional context if needed
    textBox = new QTextEdit(this);
    textBox->setPlaceholderText("Describe the bug in detail...");
    textBox->setFixedHeight(70);
    layout->addWidget(textBox);

    //Submit / Cancel
    confirm = new QDialogButtonBox(
        QDialogButtonBox::Ok | QDialogButtonBox::Cancel, this);
    layout->addWidget(confirm);
    //grey out confirm option
    confirm->button(QDialogButtonBox::Ok)->setEnabled(false);
    //check and see if an option has been selected
    connect(instructionConfuse, &QCheckBox::checkStateChanged, this, &bugReportDialog::checkSelection);
    connect(brokenTest, &QCheckBox::checkStateChanged, this, &bugReportDialog::checkSelection);
    connect(uiProblem, &QCheckBox::checkStateChanged, this, &bugReportDialog::checkSelection);

    connect(confirm, &QDialogButtonBox::accepted, this, &QDialog::accept);
    connect(confirm, &QDialogButtonBox::rejected, this, &QDialog::reject);
}

void bugReportDialog::checkSelection()
{
    bool checked = instructionConfuse->isChecked() ||
                   brokenTest->isChecked() ||
                   uiProblem->isChecked();
    confirm->button(QDialogButtonBox::Ok)->setEnabled(checked);
}


bugReportDialog::~bugReportDialog()
{
}
