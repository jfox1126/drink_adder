__author__ = 'sdesmond'
import glob
import json
import os.path, time

def update_drinks():
    print "update drinks called"
    allFiles = glob.glob("./drinks/*.json")
    print allFiles

    drinksJson = "["

    drinks = [];

    for file in allFiles:
        drinkData  = json.load(open(file))
        drinkId = drinkData.get("id")
        drinkName = drinkData.get("name")
        modifiedTime = str(time.ctime(os.path.getmtime(file)))

        drink = "{ \"id\":\"" + drinkId + "\", \"name\":\"" + drinkName + "\", \"modified\":\"" + modifiedTime + "\" }"
        print drink
        drinks.append(drink)

    i = 0
    while i < drinks.__len__():
        drinksJson += drinks[i]
        i = i + 1
        if (i != drinks.__len__()):
            drinksJson += ",\n"

    drinksJson += "]"

    drinkFile = open("data/drinksList.json", "w+")
    drinkFile.write(drinksJson)
    drinkFile.close()

    print "\n"
    print drinksJson

if __name__ == '__main__':
    # test1.py executed as script
    # do something
    update_drinks()

