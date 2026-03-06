#include "MainWindow.hh"

#include "PageStack.hh"

MainWindow::MainWindow(QWidget *parent) : QMainWindow(parent)
{
    // Create the page stack
    CW = new PageStack(this);

    // Window configuration
    resize(QSize(800, 600));

    // Set central widget
    setCentralWidget(CW);

    // Show the damn thing
    show();
}
