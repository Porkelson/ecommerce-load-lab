@REM Maven Wrapper for Windows
@SET MAVEN_HOME=%USERPROFILE%\.m2\wrapper\dists\apache-maven-3.9.6
@SET MVN_CMD=%MAVEN_HOME%\bin\mvn.cmd

@IF NOT EXIST "%MVN_CMD%" (
  @echo Downloading Maven 3.9.6...
  @MKDIR "%MAVEN_HOME%" 2>NUL
  @curl -sL "https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.6/apache-maven-3.9.6-bin.zip" -o "%MAVEN_HOME%\mvn.zip"
  @powershell -Command "Expand-Archive -Force '%MAVEN_HOME%\mvn.zip' '%USERPROFILE%\.m2\wrapper\dists\'"
  @DEL "%MAVEN_HOME%\mvn.zip"
  @REM Flatten the directory
  @FOR /D %%G IN ("%USERPROFILE%\.m2\wrapper\dists\apache-maven-3.9.6-*") DO (
    @XCOPY "%%G\*" "%MAVEN_HOME%\" /E /I /Q >NUL
    @RD /S /Q "%%G"
  )
)

@CALL "%MVN_CMD%" %*
