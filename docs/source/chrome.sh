# how do you like to call this program? (chrome-linux, chrome, chromium, google-chrome?)
APPNAME="chromium"
# get the latest build number (JSON)
VERSION=$(curl http://commondatastorage.googleapis.com/chromium-browser-continuous/Linux/LAST_CHANGE)
# get some extra metadata to display on the command line
LOGURL="http://commondatastorage.googleapis.com/chromium-browser-continuous/Linux/"$VERSION"/REVISIONS"
LOG=$(curl $LOGURL)
# build the URL of the file we'll be downloading
DOWNLOADURL="http://commondatastorage.googleapis.com/chromium-browser-continuous/Linux/"$VERSION"/chrome-linux.zip"



# Here's some command line output ...
echo -e "\r\n-------------------------"
echo "BUILD: "$VERSION
echo $LOGURL
echo $LOG
echo -e "-------------------------\r\n"

# if this was already downloaded, then it would either need to be deleted or aborted

# where should we put this 37MB download?
tempfile="/tmp/chrome-linux-"$VERSION".zip"
tempdir="."
# just putting this in my home directory now because i'm lazy
#permdir=~/$APPNAME"/"$VERSION

# get the large download ...
echo "curl $DOWNLOADURL -O $tempfile"
curl $DOWNLOADURL -o $tempfile
# mkdir -p $tempdir
unzip -o $tempfile -d $tempdir

${tempdir}/chrome-linux/chrome --headless --remote-debugging-port=9222&


