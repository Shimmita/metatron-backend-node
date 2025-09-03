
/* 
statical determine the price of the course,
use machine learning to accurately determine the course prices
for certification
 */
export function handleReturnCoursePrice(size) {
    let price=1.2;

    if (size>100 && size<=150) {
        price=1.5
    }

    if (size>150 && size<=200) {
        price=2.5
    }

    if (size>200 && size<=250) {
        price=3.5
    }

    if (size>250 && size<=300) {
        price=4.5
    }

    if (size>300 && size<=350) {
        price=5.5
    }

    if (size>350 && size<=400) {
        price=6.5
    }

    if (size>400 && size<=450) {
        price=7.5
    }

    if (size>450 && size<=500) {
        price=8.5
    }

    if (size>500 && size<=550) {
        price=9.5
    }

    if (size>550 && size<=600) {
        price=10.5
    }


    return price;
}