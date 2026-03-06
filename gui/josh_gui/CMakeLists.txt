cmake_minimum_required(VERSION 3.19)
project(DSA_VS LANGUAGES CXX)

find_package(Qt6 6.5 REQUIRED COMPONENTS Core Widgets Qml)

qt_standard_project_setup()

qt_add_executable(DSA_VS
    WIN32 MACOSX_BUNDLE
    main.cpp
    ProblemPage.cpp
    ProblemPage.hh
    LoginPage.hh LoginPage.cpp
    SignupPage.hh SignupPage.cpp
    AccountPage.hh AccountPage.cpp
    HomePage.hh HomePage.cpp
    PageStack.hh PageStack.cpp
    Account.hh Account.cpp
    MainWindow.hh MainWindow.cpp
)

target_link_libraries(DSA_VS
    PRIVATE
        Qt::Core
        Qt::Widgets
        Qt::Qml
)

include(GNUInstallDirs)

install(TARGETS DSA_VS
    BUNDLE  DESTINATION .
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
)

qt_generate_deploy_app_script(
    TARGET DSA_VS
    OUTPUT_SCRIPT deploy_script
    NO_UNSUPPORTED_PLATFORM_ERROR
)
install(SCRIPT ${deploy_script})
