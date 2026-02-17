include("/home/rusty/dev/DSA_VS/build/Desktop_Qt_6_10_2-Debug/.qt/QtDeploySupport.cmake")
include("${CMAKE_CURRENT_LIST_DIR}/DSA_VS-plugins.cmake" OPTIONAL)
set(__QT_DEPLOY_I18N_CATALOGS "qtbase")

qt6_deploy_runtime_dependencies(
    EXECUTABLE "/home/rusty/dev/DSA_VS/build/Desktop_Qt_6_10_2-Debug/DSA_VS"
    GENERATE_QT_CONF
)
