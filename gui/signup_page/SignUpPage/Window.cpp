#include "Window.hh"

Window::~Window() {


}

Window::Window(QWidget *_parent)
    : QMainWindow(_parent)
{
    allocContents();
    setContents();
}

void Window::allocContents() {
    CW = new QWidget();

    lytMain = new QVBoxLayout();
}

void Window::setContents() {

}
